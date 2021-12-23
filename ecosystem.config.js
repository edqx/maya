module.exports = {
    apps: [
        {
            name: "api",
            script: "api/dist/bin/index.js",
            cwd: "api",
            env: {
                PORT: 8000
            }
        },
        {
            name: "bot",
            script: "bot/dist/index.js",
            cwd: "bot"
        },
        {
            name: "deploy",
            script: "deploy/dist/index.js",
            cwd: "deploy",
            env: {
                PORT: 8002
            }
        },
        {
            name: "web",
            script: "web/build/index.js",
            cwd: "web/build",
            env: {
                PORT: 8001
            }
        }
    ]
}