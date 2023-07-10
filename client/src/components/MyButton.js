import React from 'react';
import axios from 'axios';

const MyButton=() =>{
  const handleClick=()=> {
    console.log("clicked");
  }
  return (
    <button onClick={handleClick}>
      Sign up with google
    </button>
  );
};

export default MyButton;
