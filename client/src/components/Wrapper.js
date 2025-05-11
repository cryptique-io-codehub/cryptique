import React from 'react';

const Wrapper = ({ title, description, children }) => {
  return (
    <div className="page-wrapper">
      {/* Page header with title and description */}
      <div className="page-header">
        {title && <h1 className="page-title">{title}</h1>}
        {description && <p className="page-description">{description}</p>}
      </div>
      
      {/* Page content */}
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default Wrapper; 