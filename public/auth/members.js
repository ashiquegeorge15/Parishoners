import { getAllMembers } from './firebase-config.js';

async function displayMembers() {
    try {
        const members = await getAllMembers();
        const container = document.querySelector('.members-container');
        container.innerHTML = ''; // Clear existing content
        
        if (members.length === 0) {
            container.innerHTML = '<p class="text-center">No members found</p>';
            return;
        }

        members.forEach(member => {
            const memberCard = `
                <div class="member-card">
                    <div class="member-image">
                        <img src="${member.photoURL || '../img/icon/defaultPic.png'}" alt="${member.name}">
                    </div>
                    <div class="member-info">
                        <h3>${member.name}</h3>
                        <p class="member-role">Parish Member</p>
                        <div class="member-details">
                            <p><i class="fas fa-home"></i> ${member.address || 'N/A'}</p>
                            <p><i class="fas fa-calendar-alt"></i> DOB: ${member.dob || 'N/A'}</p>
                            <p><i class="fas fa-phone"></i> ${member.phone || 'N/A'}</p>
                            <p><i class="fas fa-envelope"></i> ${member.email || 'N/A'}</p>
                        </div>
                        <div class="social-links">
                            ${member.socialMedia?.facebook ? `<a href="${member.socialMedia.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>` : ''}
                            ${member.socialMedia?.twitter ? `<a href="${member.socialMedia.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
                            ${member.socialMedia?.instagram ? `<a href="${member.socialMedia.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += memberCard;
        });
    } catch (error) {
        console.error("Error displaying members:", error);
        const container = document.querySelector('.members-container');
        container.innerHTML = '<p class="text-center text-danger">Error loading members. Please try again later.</p>';
    }
}

// Add loading state
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.members-container');
    container.innerHTML = '<p class="text-center">Loading members...</p>';
    await displayMembers();
}); 