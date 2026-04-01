const API_URL = '/api';

document.addEventListener('DOMContentLoaded', fetchUsers);

async function fetchUsers() {
    const loading = document.getElementById('loading');
    const userTable = document.getElementById('userTable');
    const userList = document.getElementById('userList');
    const errorDiv = document.getElementById('error');

    try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        
        userList.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><button class="btn-view" onclick="viewUser(${user.id})">View Detail</button></td>
            `;
            userList.appendChild(row);
        });

        loading.classList.add('hidden');
        userTable.classList.remove('hidden');
    } catch (err) {
        loading.classList.add('hidden');
        errorDiv.textContent = `Error: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

async function viewUser(id) {
    const userDetail = document.getElementById('userDetail');
    const userTable = document.getElementById('userTable');
    const detailContent = document.getElementById('detailContent');
    const errorDiv = document.getElementById('error');

    try {
        const response = await fetch(`${API_URL}/user/${id}`);
        if (!response.ok) throw new Error('User not found');
        
        const user = await response.json();
        
        detailContent.innerHTML = `
            <div class="detail-item"><strong>ID:</strong> ${user.id}</div>
            <div class="detail-item"><strong>Name:</strong> ${user.name}</div>
            <div class="detail-item"><strong>Email:</strong> ${user.email}</div>
        `;

        userTable.classList.add('hidden');
        userDetail.classList.remove('hidden');
    } catch (err) {
        errorDiv.textContent = `Error: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

function hideDetails() {
    document.getElementById('userDetail').classList.add('hidden');
    document.getElementById('userTable').classList.remove('hidden');
}
