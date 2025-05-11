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
        const teamId = req.params.teamId;
        // Find team by ID
        const this_team = await Team.findById(teamId);
        
        if (!this_team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        // Ensure the owner (first member) is always an admin
        if (this_team.user && this_team.user.length > 0 && this_team.user[0].role !== 'admin') {
            this_team.user[0].role = 'admin';
            await this_team.save();
            console.log(`Updated team ${this_team.name} to ensure owner has admin role`);
        }
        
        // Normalize all member roles to either 'admin' or 'user'
        let needsSave = false;
        if (this_team.user && this_team.user.length > 0) {
            for (let i = 0; i < this_team.user.length; i++) {
                // Skip the first member (owner) as we already ensured it's an admin
                if (i === 0) continue;
                
                // Convert 'editor' and 'viewer' roles to 'user'
                if (this_team.user[i].role !== 'admin' && this_team.user[i].role !== 'user') {
                    console.log(`Converting role '${this_team.user[i].role}' to 'user' for member at index ${i}`);
                    this_team.user[i].role = 'user';
                    needsSave = true;
                }
            }
            
            // Save the team if any roles were changed
            if (needsSave) {
                await this_team.save();
                console.log(`Updated team ${this_team.name} to normalize member roles`);
            }
        }
        
        const this_array = this_team.user;
        async function getUserNameArray(this_array) {
            const userNames = await Promise.all(
                this_array.map(async (item) => {
                    const user = await User.findOne({_id:item.userId});
                    // Skip if user not found
                    if (!user) return null;
                    
                    // Combine user data with role information
                    // Ensure role is either 'admin' or 'user'
                    const normalizedRole = item.role === 'admin' ? 'admin' : 'user';
                    
                    return {
                        ...user.toObject(),
                        role: normalizedRole
                    };
                })
            );
            res.status(200).json(userNames.filter(user => user !== null));
        }
        
        getUserNameArray(this_array);
    } catch (e) {
        console.error("Error in getMembers:", e);
        res.status(500).json({ message: "Error while fetching team members", error: e.message });
    }
}
exports.getTeamDetails = async (req, res) => {
    
    try {
        const teamDetails = await Team.find({ "user.userId": req.userId })
            .populate('createdBy', '-password') // populate user details, excluding password
            .exec();

        // Ensure the first member (owner) of each team is always an admin
        const teamsToUpdate = [];
        
        for (const team of teamDetails) {
            if (team.user && team.user.length > 0 && team.user[0].role !== 'admin') {
                team.user[0].role = 'admin';
                teamsToUpdate.push(team);
            }
        }
        
        // Save any teams that needed updating
        if (teamsToUpdate.length > 0) {
            await Promise.all(teamsToUpdate.map(team => team.save()));
            console.log(`Updated ${teamsToUpdate.length} teams to ensure owner has admin role`);
        }

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
        if (!teamss) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        // Check subscription plan and team member limits
        const subscriptionPlan = teamss.subscription?.plan || 'offchain';
        const planLimits = getPlanLimits(subscriptionPlan);
        
        // Count existing team members
        const currentMemberCount = teamss.user?.length || 0;
        
        // Check if the team has reached their member limit
        if (currentMemberCount >= planLimits.teamMembers) {
            return res.status(403).json({
                error: 'Resource limit reached',
                message: `You have reached the maximum number of team members (${planLimits.teamMembers}) allowed on your ${subscriptionPlan} plan.`,
                resourceType: 'teamMembers',
                currentUsage: currentMemberCount,
                limit: planLimits.teamMembers,
                upgradeOptions: getUpgradeOptions(subscriptionPlan)
            });
        }
        
        const userIdToCheck=this_user._id;
        // console.log(teamss);
        const this_array=teamss.user;

        // Ensure the first user (owner) always has admin role
        if (this_array.length > 0 && this_array[0].role !== 'admin') {
            this_array[0].role = 'admin';
            await teamss.save();
        }

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

// Helper function to get plan limits
function getPlanLimits(plan) {
    const SUBSCRIPTION_PLANS = {
        'offchain': {
            websites: 1,
            smartContracts: 0,
            apiCalls: 0,
            teamMembers: 1
        },
        'basic': {
            websites: 2,
            smartContracts: 1,
            apiCalls: 40000,
            teamMembers: 2
        },
        'pro': {
            websites: 5,
            smartContracts: 5,
            apiCalls: 150000,
            teamMembers: 5
        },
        'enterprise': {
            websites: 100, // High value for enterprise, can be customized
            smartContracts: 100,
            apiCalls: 1000000,
            teamMembers: 100
        }
    };

    return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['offchain'];
}

// Helper function to get upgrade options
function getUpgradeOptions(currentPlan) {
    const planHierarchy = ['offchain', 'basic', 'pro', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    
    // If already on enterprise or an invalid plan, no upgrade options
    if (currentIndex === -1 || currentPlan === 'enterprise') {
        return [];
    }
    
    // Return next plan up as an upgrade option
    const nextPlan = planHierarchy[currentIndex + 1];
    
    if (nextPlan) {
        return [{
            plan: nextPlan,
            teamMembers: getPlanLimits(nextPlan).teamMembers,
            message: `Upgrade to ${nextPlan} to add more team members`
        }];
    }
    
    return [];
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
            user: [{userId: user._id, role: 'admin'}] // Explicitly set the first user as admin
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

exports.updateMemberRole = async (req, res) => {
    try {
        // Get the email, team name, and new role from the request
        const { email, teamName, newRole } = req.body;
        
        console.log("Update member role request:", { email, teamName, newRole });
        
        // Validate inputs
        if (!email || !teamName || !newRole) {
            return res.status(400).json({ message: "Email, team name, and new role are required" });
        }
        
        // Validate role value
        if (newRole !== 'admin' && newRole !== 'user') {
            return res.status(400).json({ message: "Role must be either 'admin' or 'user'" });
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
        
        // Cannot change the role of the team owner (first member)
        if (memberIndex === 0) {
            // If attempting to change owner to 'user', reject the request
            if (newRole === 'user') {
                return res.status(403).json({ 
                    message: "Cannot change the team owner's role. The owner must remain an admin." 
                });
            } else if (team.user[0].role !== 'admin') {
                // If the owner is not an admin, make them an admin
                team.user[0].role = 'admin';
                await team.save();
                return res.status(200).json({ 
                    message: "Team owner's role set to admin as required", 
                    member: {
                        userId: user._id,
                        email: user.email,
                        name: user.firstName || user.name,
                        role: 'admin'
                    }
                });
            } else {
                // Owner is already an admin, no change needed
                return res.status(200).json({ 
                    message: "No change needed. Team owner is already an admin.",
                    member: {
                        userId: user._id,
                        email: user.email,
                        name: user.firstName || user.name,
                        role: 'admin'
                    }
                });
            }
        }
        
        // Check if the logged-in user is authorized to update member roles
        // Only admins can update member roles
        const loggedInUserMember = team.user.find(member => 
            member.userId.toString() === req.userId.toString()
        );
        
        if (!loggedInUserMember || loggedInUserMember.role !== 'admin') {
            return res.status(403).json({ 
                message: "Unauthorized. Only team admins can update member roles." 
            });
        }
        
        try {
            // Update the user's role
            console.log(`Updating role for user ${user.email} from ${team.user[memberIndex].role} to ${newRole}`);
            team.user[memberIndex].role = newRole;
            await team.save();
            
            return res.status(200).json({ 
                message: "Member role updated successfully",
                member: {
                    userId: user._id,
                    email: user.email,
                    name: user.firstName || user.name,
                    role: newRole
                }
            });
        } catch (saveError) {
            console.error("Error saving team with updated role:", saveError);
            return res.status(500).json({ 
                message: "Error saving team with updated role", 
                error: saveError.message,
                validationErrors: saveError.errors
            });
        }
    } catch (error) {
        console.error("Error updating member role:", error);
        return res.status(500).json({ 
            message: "Error updating member role", 
            error: error.message 
        });
    }
};

// New function to check subscription status
exports.getSubscriptionStatus = async (req, res) => {
    try {
        const teamName = req.params.teamName;
        
        if (!teamName) {
            return res.status(400).json({ message: "Team name is required" });
        }
        
        const team = await Team.findOne({ name: teamName });
        
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }
        
        // Default response - not in grace period
        const response = {
            inGracePeriod: false,
            gracePeriod: null,
            status: team.subscription?.status || 'incomplete',
            plan: team.subscription?.plan || 'offchain',
            billingCycle: team.subscription?.billingCycle || 'monthly'
        };
        
        // Check if subscription exists and is in grace period
        if (team.subscription) {
            // Get current period end if it exists
            const currentPeriodEnd = team.subscription.currentPeriodEnd;
            
            if (currentPeriodEnd) {
                const now = new Date();
                const endDate = new Date(currentPeriodEnd);
                
                // If subscription has ended but status is still active or past_due
                // This is the grace period
                if (endDate < now && 
                    (team.subscription.status === 'active' || 
                     team.subscription.status === 'past_due')) {
                    
                    // Calculate days left in grace period (default 7 days)
                    const gracePeriodDays = 7;
                    const gracePeriodEnd = new Date(endDate);
                    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
                    
                    // If still in grace period
                    if (now < gracePeriodEnd) {
                        const daysLeft = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
                        
                        response.inGracePeriod = true;
                        response.gracePeriod = {
                            endDate: gracePeriodEnd.toISOString(),
                            daysLeft: daysLeft
                        };
                    }
                }
            }
        }
        
        return res.status(200).json(response);
    } catch (error) {
        console.error("Error checking subscription status:", error);
        return res.status(500).json({ 
            message: "Error checking subscription status", 
            error: error.message 
        });
    }
};