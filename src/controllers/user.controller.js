import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res) => {
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username and email  
    //check for images ,check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in DB
    //remove password and refresh token field from response
    //check for user creation
    //return res

    const {fullname , email, username , password} = req.body
    console.log("email : ",email);
    console.log("fullname : ",fullname);
    console.log("username : ",username);
    console.log("password : ",password);
    
    if(
        [fullname, email , username , passwrod].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields are Required!!")
    }

    const isUser = User.findOne({
        $or: [{username},{email}]
    })

    if(isUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    User.create({
        fullname,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findbyId(user._id)(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

export {registerUser};