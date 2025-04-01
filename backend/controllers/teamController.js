const Team=require("../models/team")
const User=require("../models/user")


exports.getAdminTeamDetails=async (req,res)=>{
    
    try {
        // Fetch teams where the logged-in user is the creator
        const teamDetails = await Team.find({ createdBy: req.userId });

        if (!teamDetails || teamDetails.length === 0) {
            return res.status(404).json({ message: "No teams found" });
        }

        res.status(200).json({ team: teamDetails });
    } catch (e) {
        res.status(500).json({ message: "Error while fetching teams", error: e.message });
    }

}
exports.getMembers=async (req,res)=>{
    
    try {
        const team_name=req.body.teams;
        // Fetch teams where the logged-in user is the creator
        const this_team = await Team.findOne({name:team_name});
        const this_array=this_team.user;
        async function getUserNameArray(this_array) {
            const userNames = await Promise.all(
                this_array.map(async (item) => {
                    const user = await User.findOne({_id:item.userId});
                    return user ? user: null; // Store the name or null if not found
                })
            );
            res.status(200).json(userNames);
            
            // console.log(userNames.filter(name => name !== null)); // Remove null values
        }
        
        // Example usage
        
        getUserNameArray(this_array);
    } catch (e) {
        res.status(500).json({ message: "Error while fetching teams", error: e.message });
    }

}
exports.getTeamDetails = async (req, res) => {
    
    try {
        const teamDetails = await Team.find({ "user.userId": req.userId })
            .populate('createdBy', '-password') // populate user details, excluding password
            .exec();

        // console.log(teamDetails);

        if (!teamDetails || teamDetails.length === 0) {
            return res.status(404).json({ message: "Details not found" });
        }
        
        res.status(200).json({ team: teamDetails });
    } catch (e) {
        res.status(500).json({ message: 'Error while fetching members', error: e.message });
    }
}

exports.addMember=async (req,res)=>{
    try {
       const email=req.body.email;
       const role=req.body.role;
       const team_name=req.body.teamss;
        // Find user by email
        const this_user = await User.findOne({ email });
        // console.log(this_user);
        if (!this_user) {
            return res.status(404).json({ message: "User not found" });
        }

        

        // Find team created by current user
        const teamss = await Team.findOne({name:team_name });
        const userIdToCheck=this_user._id;
        // console.log(teamss);
        const this_array=teamss.user;


         // The user ID to check

// Check if the user already exists in the array
        console.log(this_array);
        const user = this_array.some(item => item.userId.equals(userIdToCheck));
        console.log(user);  
        if (user) {
        return res.status(400).json({ message: "User already exist" });
        }
        await Team.findOneAndUpdate(
            { _id: teamss._id },
            { $push: { user: { userId: this_user._id, role } } },
            { new: true, runValidators: true }
        );
    
        // Update the user document directly using findOneAndUpdate
        await User.findOneAndUpdate(
            { _id: userIdToCheck },
            { $addToSet: { team: teamss._id } }, // $addToSet prevents duplicates
            { new: true, runValidators: true }
        );
        



    
        // Instead of modifying the team object and saving it,
        // use findOneAndUpdate to update the team directly
        
    
        // Fetch the updated team to return in the response
        const updatedTeam = await Team.findById(teamss._id);
        
        return res.status(200).json({ message: "members added successfully", team: updatedTeam });
    
    } catch (e) {
        console.error("Error in team member addition:", e);
        res.status(500).json({ message: 'Error adding member', error: e.message });
    }

}

exports.createNewTeam=async(req,res)=>{
    try{
    const {teamName,email}=req.body;
    const user = await User.findOne({ email });
    console.log('a');
    // console.log(user);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const teams =await Team.findOne({ name:teamName });
    // console.log(teams);
    if(!teams){
        const newTeam = new Team({
            name:teamName,
            createdBy:user._id,
            user:[{userId:user._id,role:'admin'}]
          })
       
          //save the team to the database
        
        await newTeam.save();
        user.team=[newTeam._id];
    
        await user.save();
        res.status(200).json({ message:'Team Created Successfully',newTeam});
    }
    else{
        res.status(400).json({ message:'Team already exist'});
    }
    // console.log(user);
    
    }
    catch(err){
        res.status(500).json({ message: 'Error creating team', error: error.message });
    }

}