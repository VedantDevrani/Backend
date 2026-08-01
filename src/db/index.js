import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB is connected !! Connection Host : ${connectionInstance}`)
    }
    catch(error){
        console.log("DB connection Error : ",error);
        process.exit(1);
    }
}

export default connectDB;