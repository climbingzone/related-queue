const path = require('path');
const { lstatSync, readdirSync } = require('fs');
// get listing of packages in the mono repo
const basePath = path.resolve(__dirname, 'packages');
const packages = readdirSync(basePath).filter((name) => {
  return lstatSync(path.join(basePath, name)).isDirectory();
});

module.exports = {
  preset: 'ts-jest',

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // A set of global variables that need to be available in all test environments
  globals: {
    'ts-jest': {
      tsconfig: path.resolve(__dirname, 'tsconfig.test.json'),
    },
  },

  moduleFileExtensions: ['ts', 'js'],

  testEnvironment: 'node',

  testMatch: ['**/?(*.)+(spec|test).ts'],

  moduleNameMapper: {
    ...packages.reduce(
      (acc, name) => ({
        ...acc,
        [`@related-queue/${name}(.*)$`]: `<rootDir>/packages/./${name}/src/$1`,
      }),
      {}
    ),
  },
};
