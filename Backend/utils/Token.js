import jwt from 'jsonwebtoken';
import {ENV_VARS} from '../config/config.js';

export const token = (userid, res) => {
    const token = jwt.sign({userid}, ENV_VARS.JWT_SECRET, {expiresIn: '15d'});
    res.cookie("hello-guys", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        samesite: 'strict',
        secure: ENV_VARS.NODE_ENV !== "development" 
    });
    return token;
};