import * as express from "express";
import { join, resolve } from "path";

const port = process.env.PORT || 3000;

express()
  .use(express.static(join(__dirname, "static")))
  .listen(port, () => console.log(`Server is listening on port ${port}.`));
