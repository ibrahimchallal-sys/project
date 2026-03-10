import React from 'react';
import styled from 'styled-components';

const Button = () => {
    return (
        <StyledWrapper>
            <button type="submit">Se Connecter</button>
        </StyledWrapper>
    );
}

const StyledWrapper = styled.div`
  button {
    padding: 17px 40px;
    border-radius: 50px;
    cursor: pointer;
    border: 0;
    background-color: #1f93ff;
    box-shadow: rgb(0 0 0 / 5%) 0 0 8px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-size: 15px;
    transition: all 0.5s ease;
    width: 70%;
    color: hsl(0, 0%, 100%);
  }

  button:hover {
    letter-spacing: 3px;
    background-color: #1f93ff;
    color: hsl(0, 0%, 100%);
    box-shadow: rgba(31, 147, 255, 0.4) 0px 7px 29px 0px;
  }

  button:active {
    letter-spacing: 3px;
    background-color: #1f93ff;
    color: hsl(0, 0%, 100%);
    box-shadow: rgba(31, 147, 255, 0.2) 0px 0px 0px 0px;
    transform: translateY(10px);
    transition: 100ms;
  }`;

export default Button;
