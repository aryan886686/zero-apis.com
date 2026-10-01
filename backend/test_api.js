const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@apigateway.com', password: 'Admin@123456' })
    });
    const loginData = await res.json();
    console.log('Login:', loginData);
    if (!loginData.success) return;
    
    const token = loginData.data.token;

    // Create a moderator
    const res2 = await fetch('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: 'Mod 1', email: 'mod1@test.com', password: 'password123', role: 'moderator' })
    });
    const modData = await res2.json();
    console.log('Create Mod:', modData);

    const modId = modData.data._id;

    // Change mod password
    const res3 = await fetch(`http://localhost:3000/api/admin/users/${modId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ newPassword: 'newpassword123' })
    });
    const passData = await res3.json();
    console.log('Change Pass:', passData);

    // Try logging in as mod with NEW password
    const res4 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mod1@test.com', password: 'newpassword123' })
    });
    const modLogin = await res4.json();
    console.log('Mod Login New:', modLogin);

    // Try logging in as mod with OLD password
    const res5 = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mod1@test.com', password: 'password123' })
    });
    const modLoginOld = await res5.json();
    console.log('Mod Login Old:', modLoginOld);
    
  } catch (err) {
    console.error(err);
  }
}
test();
