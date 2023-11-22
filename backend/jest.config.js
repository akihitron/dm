module.exports = {
    // preset: "ts-jest",
    // ... lots of props
    transform: {
        '^.+\\.(t|j)sx?$': ['@swc-node/jest'],
      },
    
    moduleDirectories: ["node_modules", "src"],
    "modulePaths": [
        "<rootDir>/src"
    ],
}
