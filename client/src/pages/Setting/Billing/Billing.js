import React from 'react'
import BillingSection from './BillingSection'
import Sidebar from '../../../components/Sidebar'
import Header from '../../../components/Header'
function Billing() {
  return (
    <div>
        <div className=" flex">
      <Sidebar />
              
              <div className=' flex flex-col'>
    <Header/>
              <BillingSection/>
              </div>
            </div>
    </div>
  )
}

export default Billing
