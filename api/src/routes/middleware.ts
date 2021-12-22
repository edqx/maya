import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { useMiddleware } from "../util/useMiddleware";

export default [
    useMiddleware(cors({
        origin: process.env.AUTH_CALLBACK_URL,
        credentials: true
    })),
    useMiddleware(express.json()),
    useMiddleware(cookieParser())
];