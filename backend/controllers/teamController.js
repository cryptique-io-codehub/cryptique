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
exports.getTeamDetails=async (req,res)=>{
    
    try{
        const teamDetails = await Team.find({ "user.userId": req.userId })
        console.log(teamDetails);

        if(!teamDetails) res.status(404).json({message:"details not found"});

        res.status(200).json({team:teamDetails});
    }catch(e){
        res.status(500).json({ message: 'Error while fetching members', error: e.message });
    }


}
exports.addMember=async (req,res)=>{
    try {
        console.log(req.body);
        const { email, role } = req.body;
    
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
    
        // Find team created by current user
        const team = await Team.findOne({ createdBy: req.userId });
        if (!team) {
            return res.status(404).json({ message: "team not found" });
        }
    
        // Check if user already exists with this role
        const userExistsWithRole = team.user.some(
            (member) => member.userId.equals(user._id) && member.role === role
        );
        if (userExistsWithRole) {
            return res.status(400).json({ message: "User with this role is already in the team" });
        }
    
        // Instead of modifying the team object and saving it,
        // use findOneAndUpdate to update the team directly
        await Team.findOneAndUpdate(
            { _id: team._id },
            { $push: { user: { userId: user._id, role } } },
            { new: true, runValidators: true }
        );
    
        // Update the user document directly using findOneAndUpdate
        await User.findOneAndUpdate(
            { _id: user._id },
            { $addToSet: { team: team._id } }, // $addToSet prevents duplicates
            { new: true, runValidators: true }
        );
    
        // Fetch the updated team to return in the response
        const updatedTeam = await Team.findById(team._id);
        
        return res.status(200).json({ message: "members added successfully", team: updatedTeam });
    
    } catch (e) {
        console.error("Error in team member addition:", e);
        res.status(500).json({ message: 'Error adding member', error: e.message });
    }

}

exports.createNewTeam=async(req,res)=>{
    console.log('a');
    console.log(req.body);
    console.log('b');
    try{
    const {teamName,email}=req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const teams =await Team.findOne({ name:teamName });
    console.log(teams);
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
        res.status(200).json({ message:'Team Created Successfully',user });
    }
    else{
        res.status(400).json({ message:'Team already exist'});
    }
    console.log(user);
    
    }
    catch(err){
        res.status(500).json({ message: 'Error creating team', error: error.message });
    }


}