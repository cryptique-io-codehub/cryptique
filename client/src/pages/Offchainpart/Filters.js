import React, { useState } from 'react';

const Filters=({selectedWebsite, setSelectedWebsite,selectedDate,setSelectedDate,selectedFilters,setSelectedFilters})=>{
    return (
        <div className="bg-white p-3 shadow-sm rounded-2xl mx-4 mb-4">
              <div className="max-w-7xl mx-auto flex space-x-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-600 mb-0.5">Website</label>
                  <select 
                    className="w-full border rounded-xl px-1 py-0.5 text-xs"
                    value={selectedWebsite}
                    onChange={(e) => setSelectedWebsite(e.target.value)}
                  >
                    <option>Dropdown</option>
                    <option>Website 1</option>
                    <option>Website 2</option>
                    <option>Website 3</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-600 mb-0.5">Dates</label>
                  <select 
                    className="w-full border rounded-xl px-1 py-0.5 text-xs"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    <option>Select Date</option>
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>This month</option>
                    <option>Custom range</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-600 mb-0.5">Filters</label>
                  <select 
                    className="w-full border rounded-xl px-1 py-0.5 text-xs"
                    value={selectedFilters}
                    onChange={(e) => setSelectedFilters(e.target.value)}
                  >
                    <option>Select Filters</option>
                    <option>New users</option>
                    <option>Returning users</option>
                    <option>All traffic sources</option>
                  </select>
                  </div>
              </div>
            </div>
    )
}


export default Filters;