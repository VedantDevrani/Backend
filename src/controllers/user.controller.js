import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
        const AccessToken = user.generateAccessToken()
        const RefreshToken = user.generateRefreshToken()

        user.refreshToken = RefreshToken
        await user.save({validateBeforeSave : false})

        return {AccessToken,RefreshToken}
    }catch(error){
        console.log("token error : ",error)
        throw new ApiError(500,"Something went wrong whilw generating access and refresh tokens")
    }
}


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
        [fullname, email , username , password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields are Required!!")
    }

    const isUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(isUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})


const loginUser = asyncHandler(async (req,res) => {
    //req body - data
    //username or email
    //find the user
    //password check
    //access and refresh token 
    const {email, username, password} = req.body;
    if(!username && !email){
        throw new ApiError(400,"username or password is required");
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }

    const {AccessToken,RefreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure: true,
    }

    return res.status(200).cookie("accessToken",AccessToken,options)
    .cookie("refreshToken",RefreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser,AccessToken,RefreshToken
            },
            "User loggedIn Successfully"
        )
    )


})


const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly : true,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged out successfully"
        )
    );
})


const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request") 
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token") 
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            securev: true
        }
    
        const {accessToken,newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(
            new ApiResponse(
                200,
                {accessToken,newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
})


const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password = newPassword
    await user.save({validatebeforeSave : false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed succesfully"))

})


const getCurrentUser = asyncHandler(async(req,res) => {
    return res.status(200).json(new ApiResponse(200,req.user,"current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname : fullname,
                email : email
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Account details updates successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is Missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Avatar Updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res) => {

    const coverLocalPath = req.file?.path

    if(!coverLocalPath){
        throw new ApiError(400,"Cover file is Missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage .url){
        throw new ApiError(400,"Error while uploading on cover")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Cover image Updated successfully"))
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar
};