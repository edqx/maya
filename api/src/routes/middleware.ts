import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { useMiddleware } from "../util/useMiddleware";

export default [
    useMiddleware(cors({
        origin: process.env.BASE_WEB,
        credentials: true
    })),
    useMiddleware(express.json()),
    useMiddleware(cookieParser())
];