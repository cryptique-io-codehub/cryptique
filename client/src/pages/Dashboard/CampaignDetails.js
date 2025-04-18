import React from 'react';
import { StatCard } from '../../components';
import { VisibilityIcon, GroupIcon, PersonIcon } from '@mui/icons-material';

const CampaignDetails = ({ campaign }) => {
  return (
    <div className="stats-container">
      <StatCard
        title="Total Visitors"
        value={campaign.stats.visitors}
        icon={<VisibilityIcon />}
      />
      <StatCard
        title="Web3 Users"
        value={campaign.stats.web3Users}
        icon={<GroupIcon />}
      />
      <StatCard
        title="Unique Web3 Users"
        value={campaign.stats.uniqueWeb3Users}
        icon={<PersonIcon />}
      />
    </div>
  );
};

export default CampaignDetails; 