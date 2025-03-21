const Team=require("../models/team")
const User=require("../models/user")


exports.getTeamDetails=async (req,res)=>{
    try{
        const teamDetails=await Team.findOne({
            createdBy:req.userId
        })

        if(!teamDetails) res.status(404).json({message:"details not found"});

        res.status(200).json({team:teamDetails})
    }catch(e){
        res.status(500).json({ message: 'Error while fetching members', error: e.message });
    }
}
exports.addMember=async (req,res)=>{
    try{
        const {email,role}=req.body;

        const user=await User.findOne({
            email,
        })
        
        if(!user){
            return res.status(404).json({message:"User not found"});
        }

        const team=await Team.findOne({
            createdBy:req.userId,
        })

        if(!team){
            return res.status(404).json({message:"team not found"});
        }

        team.user.push({userId:user._id,role});

        await team.save();

        user.team.push(team._id);

        await user.save();

        return res.status(200).json({message:"member added successfully",team});


    }catch(e){
        res.status(500).json({ message: 'Error adding member', error: e.message });
    }
}