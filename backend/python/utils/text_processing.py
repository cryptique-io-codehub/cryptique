def transform_analytics_to_text(analytics_data, site_info):
    """Transform analytics data to natural language descriptions."""
    domain = site_info.get('Domain', 'Unknown domain')
    
    descriptions = []
    
    # Overview metrics
    if analytics_data.get('uniqueVisitors') or analytics_data.get('totalPageViews'):
        unique_visitors = analytics_data.get('uniqueVisitors', 0)
        page_views = sum(analytics_data.get('pageViews', {}).values() or [0])
        avg_duration = analytics_data.get('averageSessionDuration', 0)
        bounce_rate = analytics_data.get('bounceRate', 0)
        
        overview = f"""
        Website {domain} had {unique_visitors} unique visitors and {page_views} total page views.
        """
        
        if avg_duration:
            minutes = int(avg_duration // 60)
            seconds = int(avg_duration % 60)
            overview += f"The average session duration was {minutes} minutes and {seconds} seconds. "
            
        if bounce_rate:
            overview += f"The bounce rate was {bounce_rate:.1f}%. "
            
        descriptions.append(overview.strip())
    
    # Web3 specific metrics
    if analytics_data.get('web3Visitors') or analytics_data.get('walletsConnected'):
        web3_visitors = analytics_data.get('web3Visitors', 0)
        wallets_connected = analytics_data.get('walletsConnected', 0)
        
        web3_metrics = f"""
        {web3_visitors} visitors had Web3 wallets installed, and {wallets_connected} visitors connected their wallets.
        """
        
        wallet_types = analytics_data.get('walletTypes', {})
        if wallet_types:
            top_wallets = sorted(wallet_types.items(), key=lambda x: x[1], reverse=True)[:3]
            wallet_text = ", ".join([f"{wallet}: {count}" for wallet, count in top_wallets])
            web3_metrics += f"The most common wallet types were: {wallet_text}."
            
        descriptions.append(web3_metrics.strip())
    
    # Page metrics
    page_views = analytics_data.get('pageViews', {})
    if page_views:
        top_pages = sorted(page_views.items(), key=lambda x: x[1], reverse=True)[:5]
        page_text = ", ".join([f"{page}: {views} views" for page, views in top_pages])
        
        descriptions.append(f"The most visited pages were: {page_text}.")
    
    return descriptions

def transform_contract_to_text(contract_data, transactions):
    """Transform contract data and transactions to natural language descriptions."""
    if not transactions:
        return []
    
    descriptions = []
    
    # Extract contract info
    contract_name = contract_data.get('name', 'Unknown contract')
    contract_address = contract_data.get('address', 'Unknown address')
    blockchain = contract_data.get('blockchain', 'Unknown blockchain')
    token_symbol = contract_data.get('tokenSymbol', 'tokens')
    
    # Calculate metrics
    tx_count = len(transactions)
    total_volume = sum(float(tx.get('value_eth', 0) or 0) for tx in transactions)
    unique_wallets = len(set(tx.get('from_address') for tx in transactions if tx.get('from_address')))
    
    # Format contract address for display
    short_address = f"{contract_address[:6]}...{contract_address[-4:]}" if len(contract_address) > 10 else contract_address
    
    # Overview
    overview = f"""
    Smart contract {contract_name} ({short_address}) on {blockchain} had {tx_count} transactions.
    The total transaction volume was {total_volume:.2f} {token_symbol}.
    There were {unique_wallets} unique wallets interacting with this contract.
    """
    
    descriptions.append(overview.strip())
    
    # Transaction patterns
    if tx_count > 1:
        # Sort transactions by time
        sorted_txs = sorted(transactions, key=lambda x: x.get('block_time', ''))
        
        if sorted_txs[0].get('block_time') and sorted_txs[-1].get('block_time'):
            first_tx_time = sorted_txs[0]['block_time']
            last_tx_time = sorted_txs[-1]['block_time']
            
            patterns = f"""
            The contract has been active from {first_tx_time} to {last_tx_time}.
            """
            
            if tx_count > 0 and total_volume > 0:
                avg_value = total_volume / tx_count
                patterns += f"Average transaction value: {avg_value:.4f} {token_symbol}."
                
            descriptions.append(patterns.strip())
    
    return descriptions 