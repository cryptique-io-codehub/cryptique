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

        console.log("Team details being returned:", teamDetails.map(team => ({
            id: team._id,
            name: team.name,
            description: team.description,
            hasDescriptionField: team.hasOwnProperty('description')
        })));

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
    const {teamName, email, description} = req.body;
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
            name: teamName,
            description: description || '', // Add the description field
            createdBy: user._id,
            user: [{userId: user._id, role: 'admin'}]
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
        res.status(500).json({ message: 'Error creating team', error: err.message });
    }
}

exports.deleteTeam = async (req, res) => {
    try {
        // Get the teamId from the request
        const { teamId } = req.body;
        
        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }
        
        // Find the team by ID
        const team = await Team.findById(teamId);
        
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        // Check if the logged-in user is authorized to delete the team
        // Only the team creator or the first admin can delete a team
        const isCreator = team.createdBy && team.createdBy.equals(req.userId);
        
        // Check if the user is the first admin member of the team
        let isFirstAdmin = false;
        if (team.user && team.user.length > 0) {
            const firstMember = team.user[0];
            isFirstAdmin = firstMember.userId.equals(req.userId) && firstMember.role === 'admin';
        }
        
        if (!isCreator && !isFirstAdmin) {
            return res.status(403).json({ 
                message: "Unauthorized. Only the team creator or admin can delete a team." 
            });
        }
        
        // Remove this team from all associated users
        await User.updateMany(
            { team: teamId },
            { $pull: { team: teamId } }
        );
        
        // Delete the team
        await Team.findByIdAndDelete(teamId);
        
        return res.status(200).json({ 
            message: "Team deleted successfully", 
            teamId
        });
    } catch (error) {
        console.error("Error deleting team:", error);
        return res.status(500).json({ 
            message: "Error deleting team", 
            error: error.message 
        });
    }
};

exports.updateTeam = async (req, res) => {
    try {
        // Get the team data from the request
        const { teamId, name, description } = req.body;
        
        console.log("Update team request:", {
            teamId,
            name,
            description,
            descriptionType: typeof description,
            descriptionLength: description ? description.length : 0
        });
        
        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }
        
        if (!name) {
            return res.status(400).json({ message: "Team name is required" });
        }
        
        // Find the team by ID
        const team = await Team.findById(teamId);
        
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        console.log("Current team before update:", {
            id: team._id,
            name: team.name,
            description: team.description,
            hasDescriptionField: team.hasOwnProperty('description')
        });
        
        // Check if the logged-in user is authorized to update the team
        // Only the team creator or the first admin can update a team
        const isCreator = team.createdBy && team.createdBy.equals(req.userId);
        
        // Check if the user is the first admin member of the team
        let isFirstAdmin = false;
        if (team.user && team.user.length > 0) {
            const firstMember = team.user[0];
            isFirstAdmin = firstMember.userId.equals(req.userId) && firstMember.role === 'admin';
        }
        
        if (!isCreator && !isFirstAdmin) {
            return res.status(403).json({ 
                message: "Unauthorized. Only the team creator or admin can update a team." 
            });
        }
        
        // Check if the new name is already in use by another team
        const existingTeam = await Team.findOne({ name, _id: { $ne: teamId } });
        if (existingTeam) {
            return res.status(400).json({ message: "Team name already exists" });
        }
        
        // Update the team
        const updatedTeam = await Team.findByIdAndUpdate(
            teamId,
            { name, description },
            { new: true, runValidators: true }
        );
        
        console.log("Updated team:", {
            id: updatedTeam._id,
            name: updatedTeam.name,
            description: updatedTeam.description,
            hasDescriptionField: updatedTeam.hasOwnProperty('description')
        });
        
        return res.status(200).json({ 
            message: "Team updated successfully", 
            team: updatedTeam
        });
    } catch (error) {
        console.error("Error updating team:", error);
        return res.status(500).json({ 
            message: "Error updating team", 
            error: error.message 
        });
    }
};

exports.removeMember = async (req, res) => {
    try {
        // Get the email and team name from the request
        const { email, teamName } = req.body;
        
        console.log("Remove member request:", { email, teamName });
        
        if (!email || !teamName) {
            return res.status(400).json({ message: "Email and team name are required" });
        }
        
        // Find the team by name
        const team = await Team.findOne({ name: teamName });
        
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        // Find the user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Check if the user is a member of the team
        const memberIndex = team.user.findIndex(member => 
            member.userId.toString() === user._id.toString()
        );
        
        if (memberIndex === -1) {
            return res.status(404).json({ message: "User is not a member of this team" });
        }
        
        // Check if the logged-in user is authorized to remove a member
        // Only admins can remove team members
        const loggedInUserMember = team.user.find(member => 
            member.userId.toString() === req.userId.toString()
        );
        
        if (!loggedInUserMember || loggedInUserMember.role !== 'admin') {
            return res.status(403).json({ 
                message: "Unauthorized. Only team admins can remove members." 
            });
        }
        
        // Cannot remove the first member (team owner)
        if (memberIndex === 0) {
            return res.status(403).json({ 
                message: "Cannot remove the team owner" 
            });
        }
        
        // Remove the user from the team
        team.user.splice(memberIndex, 1);
        await team.save();
        
        // Remove the team from the user's teams array
        await User.findByIdAndUpdate(
            user._id, 
            { $pull: { team: team._id } }
        );
        
        return res.status(200).json({ 
            message: "Member removed successfully", 
            teamId: team._id,
            userId: user._id
        });
    } catch (error) {
        console.error("Error removing team member:", error);
        return res.status(500).json({ 
            message: "Error removing team member", 
            error: error.message 
        });
    }
};