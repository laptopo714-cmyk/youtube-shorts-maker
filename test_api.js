// Using built-in fetch (Node 18+)

async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley
                minDur: 10,
                maxDur: 20,
                resolution: 'original'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

test();
