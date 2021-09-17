import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { authenticationRouter } from './routers/authentication.router';
import cors from 'cors';

const start = () => {
	const app = express();
	app.use(cors());
	app.use(express.json());
	app.use(authenticationRouter);
	app.listen(3005, () => {
		console.log('App running on port 3005');
	});
};

start();
