from datetime import datetime
from typing import Dict, Any, List

class DataTransformer:
    @staticmethod
    def transform_analytics_data(analytics: Dict[str, Any]) -> str:
        """Transform analytics data into descriptive text."""
        if not analytics:
            return ""

        text_parts = []

        # Basic website metrics
        text_parts.append(f"Website {analytics.get('websiteUrl', 'Unknown')} analytics summary:")
        text_parts.append(f"Total visitors: {analytics.get('totalVisitors', 0)}")
        text_parts.append(f"Unique visitors: {analytics.get('uniqueVisitors', 0)}")
        text_parts.append(f"Web3-enabled visitors: {analytics.get('web3Visitors', 0)}")
        text_parts.append(f"Total page views: {analytics.get('totalPageViews', 0)}")
        text_parts.append(f"Wallets connected: {analytics.get('walletsConnected', 0)}")

        # User segments
        text_parts.append("\nUser Segments:")
        text_parts.append(f"New visitors: {analytics.get('newVisitors', 0)}")
        text_parts.append(f"Returning visitors: {analytics.get('returningVisitors', 0)}")

        # Page analytics
        if analytics.get('pageViews'):
            text_parts.append("\nTop Pages:")
            sorted_pages = sorted(analytics['pageViews'].items(), key=lambda x: x[1], reverse=True)[:5]
            for page, views in sorted_pages:
                text_parts.append(f"Page {page}: {views} views")

        # Wallet analytics
        if analytics.get('wallets'):
            text_parts.append("\nWallet Information:")
            wallet_types = {}
            chain_types = {}
            for wallet in analytics['wallets']:
                wallet_type = wallet.get('walletType', 'Unknown')
                chain = wallet.get('chainName', 'Unknown')
                wallet_types[wallet_type] = wallet_types.get(wallet_type, 0) + 1
                chain_types[chain] = chain_types.get(chain, 0) + 1

            for wallet_type, count in wallet_types.items():
                text_parts.append(f"{wallet_type} wallets: {count}")
            for chain, count in chain_types.items():
                text_parts.append(f"{chain} chain connections: {count}")

        # User journeys
        if analytics.get('userJourneys'):
            text_parts.append("\nUser Journey Analysis:")
            converted_users = sum(1 for journey in analytics['userJourneys'] if journey.get('hasConverted'))
            avg_sessions = sum(journey.get('totalSessions', 0) for journey in analytics['userJourneys']) / len(analytics['userJourneys'])
            text_parts.append(f"Users who connected wallets: {converted_users}")
            text_parts.append(f"Average sessions per user: {avg_sessions:.2f}")

        return "\n".join(text_parts)

    @staticmethod
    def transform_contract_data(contract: Dict[str, Any], transactions: List[Dict[str, Any]]) -> str:
        """Transform smart contract data into descriptive text."""
        if not contract or not transactions:
            return ""

        text_parts = []

        # Basic contract information
        text_parts.append(f"Smart Contract Analysis for {contract.get('name', 'Unknown Contract')}:")
        text_parts.append(f"Contract Address: {contract.get('address')}")
        text_parts.append(f"Blockchain: {contract.get('blockchain')}")
        text_parts.append(f"Token Symbol: {contract.get('tokenSymbol', 'N/A')}")

        # Transaction analysis
        total_transactions = len(transactions)
        unique_senders = len(set(tx.get('from_address') for tx in transactions))
        unique_receivers = len(set(tx.get('to_address') for tx in transactions))
        total_value = sum(float(tx.get('value_eth', 0)) for tx in transactions)

        text_parts.append(f"\nTransaction Statistics:")
        text_parts.append(f"Total Transactions: {total_transactions}")
        text_parts.append(f"Unique Senders: {unique_senders}")
        text_parts.append(f"Unique Receivers: {unique_receivers}")
        text_parts.append(f"Total Value: {total_value:.2f} ETH")

        if total_transactions > 0:
            avg_value = total_value / total_transactions
            text_parts.append(f"Average Transaction Value: {avg_value:.4f} ETH")

        # Time-based analysis
        if transactions:
            timestamps = [datetime.fromisoformat(tx['block_time'].replace('Z', '+00:00')) 
                        for tx in transactions if 'block_time' in tx]
            if timestamps:
                first_tx = min(timestamps)
                last_tx = max(timestamps)
                duration = (last_tx - first_tx).days
                text_parts.append(f"\nTime Analysis:")
                text_parts.append(f"First Transaction: {first_tx.strftime('%Y-%m-%d')}")
                text_parts.append(f"Latest Transaction: {last_tx.strftime('%Y-%m-%d')}")
                text_parts.append(f"Active Period: {duration} days")
                if duration > 0:
                    tx_per_day = total_transactions / duration
                    text_parts.append(f"Average Transactions per Day: {tx_per_day:.2f}")

        # Value distribution
        value_ranges = {
            'small': sum(1 for tx in transactions if float(tx.get('value_eth', 0)) < 0.1),
            'medium': sum(1 for tx in transactions if 0.1 <= float(tx.get('value_eth', 0)) < 1),
            'large': sum(1 for tx in transactions if 1 <= float(tx.get('value_eth', 0)) < 10),
            'whale': sum(1 for tx in transactions if float(tx.get('value_eth', 0)) >= 10)
        }

        text_parts.append("\nTransaction Size Distribution:")
        text_parts.append(f"Small (<0.1 ETH): {value_ranges['small']}")
        text_parts.append(f"Medium (0.1-1 ETH): {value_ranges['medium']}")
        text_parts.append(f"Large (1-10 ETH): {value_ranges['large']}")
        text_parts.append(f"Whale (>10 ETH): {value_ranges['whale']}")

        return "\n".join(text_parts)

    @staticmethod
    def transform_campaign_data(campaign: Dict[str, Any]) -> str:
        """Transform campaign data into descriptive text."""
        if not campaign:
            return ""

        text_parts = []
        stats = campaign.get('stats', {})

        # Basic campaign information
        text_parts.append(f"Marketing Campaign Analysis for {campaign.get('name', 'Unknown Campaign')}:")
        text_parts.append(f"Source: {campaign.get('source')}")
        text_parts.append(f"Medium: {campaign.get('medium')}")
        text_parts.append(f"Campaign ID: {campaign.get('campaign', 'N/A')}")

        # Performance metrics
        text_parts.append("\nPerformance Metrics:")
        text_parts.append(f"Total Visitors: {stats.get('visitors', 0)}")
        text_parts.append(f"Unique Visitors: {len(stats.get('uniqueVisitors', []))}")
        text_parts.append(f"Web3 Users: {stats.get('web3Users', 0)}")
        text_parts.append(f"Wallet Connections: {stats.get('uniqueWallets', 0)}")

        # Conversion metrics
        if stats.get('conversions') is not None:
            conversion_rate = (stats['conversions'] / stats['visitors'] * 100) if stats['visitors'] > 0 else 0
            text_parts.append("\nConversion Metrics:")
            text_parts.append(f"Total Conversions: {stats['conversions']}")
            text_parts.append(f"Conversion Rate: {conversion_rate:.2f}%")
            text_parts.append(f"Conversion Value: {stats.get('conversionsValue', 0)}")

        # ROI metrics
        if campaign.get('budget') and campaign['budget'].get('amount'):
            text_parts.append("\nROI Analysis:")
            text_parts.append(f"Budget: {campaign['budget']['amount']} {campaign['budget']['currency']}")
            text_parts.append(f"ROI: {stats.get('roi', 0)}%")
            text_parts.append(f"Cost per Acquisition: {stats.get('cac', 0)}")

        # Engagement metrics
        text_parts.append("\nEngagement Metrics:")
        text_parts.append(f"Average Session Duration: {stats.get('averageDuration', 0)} seconds")
        text_parts.append(f"Bounce Rate: {stats.get('bounceRate', 0)}%")

        # Transaction metrics
        if stats.get('transactions'):
            total_value = stats.get('totalTransactionValue', 0)
            avg_value = stats.get('averageTransactionValue', 0)
            text_parts.append("\nTransaction Metrics:")
            text_parts.append(f"Total Transaction Value: {total_value}")
            text_parts.append(f"Average Transaction Value: {avg_value}")
            text_parts.append(f"Transacting Users: {stats.get('transactedUsers', 0)}")

        return "\n".join(text_parts) 