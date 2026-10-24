// Opt-in Clang 23 experiment. Not linked into the shipped extractor.
// Reuses the exact production serializer without copying or changing its contract.
#define main fold_state_jump_extractor_main
#include "ast-extractor.cpp"
#undef main
#include <clang/Driver/CreateInvocationFromArgs.h>
#include <clang/Frontend/PrecompiledPreamble.h>
#include <clang/Lex/PreprocessorOptions.h>
#include <sys/resource.h>
#include <cstdlib>

namespace {
struct Sample {
  std::string name;
  std::string append;
  std::string prefix;
  std::string flag;
};

void metric(llvm::StringRef name, double wallMs, bool reused, size_t bytes,
            unsigned bounds, bool success) {
  // getrusage is a third-party stateful process API. Values are cumulative;
  // the Python harness records per-process GNU time as well.
  rusage usage{};
  getrusage(RUSAGE_SELF, &usage);
  llvm::errs() << "FSJ_PREAMBLE ";
  json::OStream output(llvm::errs());
  output.object([&] {
    output.attribute("name", name);
    output.attribute("wallMs", wallMs);
    output.attribute("canReuse", reused);
    output.attribute("pchBytes", static_cast<int64_t>(bytes));
    output.attribute("boundsBytes", bounds);
    output.attribute("success", success);
    output.attribute("cumulativeUserSeconds", usage.ru_utime.tv_sec + usage.ru_utime.tv_usec / 1e6);
    output.attribute("cumulativeSystemSeconds", usage.ru_stime.tv_sec + usage.ru_stime.tv_usec / 1e6);
    output.attribute("peakRssKiB", usage.ru_maxrss);
  });
  llvm::errs() << "\n";
}
}

int main(int argc, const char **argv) {
  // preamble-experiment SOURCE REPETITIONS -- [driver flags]
  if (argc < 5 || llvm::StringRef(argv[3]) != "--") return 2;
  const std::string source = absolutePath(argv[1]);
  const unsigned repetitions = std::stoul(argv[2]);
  const auto original = llvm::MemoryBuffer::getFile(source);
  if (!original) return 2;
  const auto invocationFor = [&](llvm::StringRef extraFlag) {
    std::vector<const char *> args{"/usr/lib/llvm-23/bin/clang++", "-fsyntax-only"};
    fold(llvm::ArrayRef<const char *>(argv + 4, argc - 4), args,
        [](auto &args, const char *arg) { args.push_back(arg); });
    const auto tail = extraFlag.empty() ? std::vector<const char *>{source.c_str()} :
        std::vector<const char *>{extraFlag.data(), source.c_str()};
    fold(tail, args, [](auto &args, const char *arg) { args.push_back(arg); });
    auto invocation = createInvocation(args);
    // Driver-created cc1 invocations assume process exit and may disable
    // freeing AST memory. This harness performs multiple parses per process.
    if (invocation) invocation->getFrontendOpts().DisableFree = false;
    return invocation;
  };
  const auto originalInvocation = invocationFor("");
  if (!originalInvocation) return 2;
  auto originalVfs = llvm::vfs::getRealFileSystem();
  const auto diagnostics = CompilerInstance::createDiagnostics(*originalVfs,
      originalInvocation->getDiagnosticOpts());
  PreambleCallbacks callbacks; // Required Clang callback interface; no custom dispatch.
  const auto bounds = ComputePreambleBounds(originalInvocation->getLangOpts(),
      (*original)->getMemBufferRef(), 0);
  const auto buildStarted = std::chrono::steady_clock::now();
  const auto preamble = PrecompiledPreamble::Build(*originalInvocation,
      original->get(), bounds, diagnostics, originalVfs,
      std::make_shared<PCHContainerOperations>(), false, "", callbacks);
  metric("build", elapsedMs(buildStarted), false, preamble ? preamble->getSize() : 0,
      bounds.Size, static_cast<bool>(preamble));
  if (!preamble) return 1;
  const auto samples = [&] {
    std::vector<Sample> samples;
    fold(llvm::seq(0u, repetitions), samples, [](auto &samples, unsigned index) {
    samples.push_back({"reuse-" + std::to_string(index), "", "", ""});
    });
    const std::vector<Sample> edits{
      {"body-edit", "", "", ""},
      {"preamble-edit", "", "#define FSJ_PREFIX_EDIT 1\n", ""},
      {"macro-edit", "", "", "-DFSJ_CHANGED_OPTION=1"},
      {"standard-edit", "", "", "-std=c++20"}};
    fold(edits, samples, [](auto &samples, const auto &sample) { samples.push_back(sample); });
    return samples;
  }();
  const bool success = std::accumulate(samples.begin(), samples.end(), true,
      [&](bool success, const Sample &sample) {
    const auto started = std::chrono::steady_clock::now();
    auto invocation = invocationFor(sample.flag);
    if (!invocation) return false;
    const auto contents = [&] {
      const auto contents = (*original)->getBuffer().str();
      const auto position = contents.find("return ");
      const std::string fixtureReturn = "return VALUE + INITIAL;";
      const auto fixturePosition = contents.find(fixtureReturn);
      if (sample.name == "body-edit" && fixturePosition != std::string::npos)
        return contents.substr(0, fixturePosition) + "return VALUE + INITIAL + 1;" +
            contents.substr(fixturePosition + fixtureReturn.size());
      return sample.name == "body-edit" && position != std::string::npos ?
          contents.substr(0, position) + "return /* fsj-body-edit */ " + contents.substr(position + 7) : contents;
    }();
    const auto buffer = llvm::MemoryBuffer::getMemBufferCopy(
        sample.prefix + contents + sample.append, source);
    auto vfs = llvm::vfs::getRealFileSystem();
    const auto sampleBounds = ComputePreambleBounds(invocation->getLangOpts(),
        buffer->getMemBufferRef(), 0);
    const bool reuse = preamble->CanReuse(*invocation, buffer->getMemBufferRef(), sampleBounds, *vfs);
    // CanReuse is studied separately from the invocation/BuildIdentity gate.
    // Never feed a known changed compilation context to AddImplicitPreamble.
    if (!reuse || !sample.flag.empty()) {
      metric(sample.name, elapsedMs(started), reuse, preamble->getSize(), sampleBounds.Size, true);
      return success;
    }
    preamble->AddImplicitPreamble(*invocation, vfs, buffer.get());
    // Caller owns this buffer, which must survive ExecuteAction. Clang's
    // default remapping policy otherwise takes ownership of the raw pointer.
    invocation->getPreprocessorOpts().RetainRemappedFileBuffers = true;
    CompilerInstance compiler(std::move(invocation));
    compiler.setVirtualFileSystem(vfs);
    compiler.createDiagnostics();
    ExtractionAction action(source, "");
    const bool parsed = compiler.ExecuteAction(action);
    llvm::outs().flush();
    metric(sample.name, elapsedMs(started), reuse, preamble->getSize(), sampleBounds.Size, parsed);
    return success && parsed;
  });
  if (const char *header = std::getenv("FSJ_PREAMBLE_HEADER")) {
    const auto status = originalVfs->status(header);
    const auto headerBuffer = llvm::MemoryBuffer::getFile(header);
    if (!status || !headerBuffer) return 2;
    const auto probe = [&](llvm::StringRef name, std::string content) {
      const auto started = std::chrono::steady_clock::now();
      auto files = llvm::makeIntrusiveRefCnt<llvm::vfs::InMemoryFileSystem>();
      const auto seconds = std::chrono::duration_cast<std::chrono::seconds>(
          status->getLastModificationTime().time_since_epoch()).count();
      files->addFile(header, seconds, llvm::MemoryBuffer::getMemBufferCopy(content, header));
      auto vfs = llvm::makeIntrusiveRefCnt<llvm::vfs::OverlayFileSystem>(originalVfs);
      vfs->pushOverlay(files);
      const bool reuse = preamble->CanReuse(*originalInvocation,
          (*original)->getMemBufferRef(), bounds, *vfs);
      metric(name, elapsedMs(started), reuse, preamble->getSize(), bounds.Size, true);
    };
    const auto content = (*headerBuffer)->getBuffer().str();
    probe("header-size-edit", content + "\n");
    const auto position = content.find('1');
    probe("header-same-size-restored-mtime", position == std::string::npos ? content :
        content.substr(0, position) + "2" + content.substr(position + 1));
  }
  return success ? 0 : 1;
}
