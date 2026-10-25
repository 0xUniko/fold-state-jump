import path from 'node:path';

export const resolveExtractorPath = (extensionPath: string, configuredExtractor = ''): string =>
  configuredExtractor
    ? (path.isAbsolute(configuredExtractor) ? configuredExtractor : path.resolve(extensionPath, configuredExtractor))
    : path.join(extensionPath, 'native', 'build', 'fold-state-jump-ast');
