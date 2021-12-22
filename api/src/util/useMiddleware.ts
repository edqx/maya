import express from "express";
import { MayaApiServer } from "../index";

export function useMiddleware(middleware: express.RequestHandler) {
    return function (_server: MayaApiServer, req: express.Request, res: express.Response) {
        return new Promise(resolve => {
            middleware(req, res, () => resolve(true));
        });
    }
}