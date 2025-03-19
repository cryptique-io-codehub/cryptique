import React from "react";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <>
    <div className="  bg-orange-400  flex items-center justify-between p-4 px-7 ">

      Cryptique.io
      <Link to={"/login"} className=" px-4 py-2 border text-white rounded-md cursor-pointer">
        Login
      </Link>
    </div>
    <div className="   flex items-center justify-center   h-[84vh] font-bold">
      This is the landing page
    </div>
    
    </>
  );
}

export default LandingPage;
