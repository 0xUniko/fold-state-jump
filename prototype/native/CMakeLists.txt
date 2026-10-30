cmake_minimum_required(VERSION 3.20)
project(fold_state_research LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(LLVM REQUIRED CONFIG)
find_package(Clang REQUIRED CONFIG)
if(NOT LLVM_VERSION_MAJOR EQUAL 23)
  message(FATAL_ERROR "This research prototype requires LLVM/Clang 23; found ${LLVM_PACKAGE_VERSION}")
endif()

message(STATUS "LLVM ${LLVM_PACKAGE_VERSION}: ${LLVM_DIR}")
message(STATUS "Clang: ${Clang_DIR}")

add_executable(ast-inventory ast-inventory.cpp)
target_include_directories(ast-inventory SYSTEM PRIVATE
  ${LLVM_INCLUDE_DIRS} ${CLANG_INCLUDE_DIRS})
target_compile_definitions(ast-inventory PRIVATE ${LLVM_DEFINITIONS})
target_link_libraries(ast-inventory PRIVATE clang-cpp LLVM)
