import React from 'react';
import { Link } from 'react-router-dom';
import img from '../../images/cat.jpg';

const NoData = () => {
  return (
    <div className="container p-5 grid grid-cols-1 justify-items-center">
      <h1 className="text-5xl text-danger ">Sorry, no data found in such a directory.</h1>
      <img className="h-60 w-auto rounded-lg" src={img} alt="" />
      <Link to="/" className="btn btn-success">
        Go Back Home
      </Link>
    </div>
  );
};

export default NoData;
