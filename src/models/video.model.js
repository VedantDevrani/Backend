import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        videoFile:{
            type: String, // cloudinary
            required: true,

        },
        thumbnail:{
            type:String,
            required,
        },
        title:{
            type:String,
            required,
        },
        description:{
            type:String,
            required,
        },
        duration:{
            type:Number,
            required,
        },
        views:{
            type:Number,
            default: 0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }

    },
    {
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = new mongoose.model("Video",videoSchema);