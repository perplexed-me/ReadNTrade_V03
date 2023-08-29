// const axios = require('axios')

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  // console.log(data)

  try {
    const response = await axios.post('http://localhost:3000/login', data);
    console.log(response.data)
    if (response.data && response.status === 200) {  // Check for a specific condition to ensure login success
      window.location.href = '/home';
    }
    else {
      document.body.classList.add("jerk-page");

      // remove the jerk-page class after 0.5 seconds to revert the effect.
      setTimeout(() => {
        document.body.classList.remove("jerk-page");
      }, 500);
  }

  }
  catch (error) {
    console.error('Error during login:', error);
    alert('An error occurred during login.');
  }
});



//---------------------------------------------------------------------------------




document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    // username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password')
  };
  // console.log(data)


  try {
    const response = await axios.post('/signup',data)

    if (response.data && response.status === 200){
       window.location.href = '/index';

    } else {
      alert('Sign up failed! Please try again.');
    }
  } catch (error) {
    console.error('Error during sign up:', error);
    alert('An error occurred during sign up.');
  }
});

