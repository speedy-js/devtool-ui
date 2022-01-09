const path = require("path");
/**
 * @example
 *  const uiPath = require("@speedy-js/devtool-ui").uiPath;
 *  koaApp.use(serve(uiPath)); // access ${host}:${port}/ -> devtool ui
 */
module.exports = { uiPath: path.resolve(__dirname, "dist") };
