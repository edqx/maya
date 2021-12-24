module.exports = {
    apps: [
        {
            name: "api",
            script: "dist/bin/index.js",
            cwd: "api",
            env: {
                PORT: 8000
            }
        },
        {
            name: "bot",
            script: "dist/bin/index.js",
            cwd: "bot"
        },
        {
            name: "deploy",
            script: "dist/index.js",
            cwd: "deploy",
            env: {
                PORT: 8002
            }
        },
        {
            name: "web",
            script: "index.js",
            cwd: "web/build",
            env: {
                PORT: 8001
            }
        }
    ]
}