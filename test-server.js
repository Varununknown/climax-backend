const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Mock content data (same IDs as frontend)
let contents = [
  {
    _id: '68a85f60f557a6c9b886a1d2',
    title: 'A S N',
    description: 'Avane sriman Narayana | Song',
    videoUrl: 'https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/example.mp4',
    thumbnail: 'https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/example.jpg',
    category: 'Music',
    type: 'movie',
    language: 'Kannada',
    duration: 180,
    climaxTimestamp: 60,
    premiumPrice: 0,
    genre: ['Music'],
    rating: 4.5,
    isActive: true,
    createdAt: '2025-08-22T12:15:28.576Z'
  },
  {
    _id: '687b9764070be62a95a73605',
    title: 'new',
    description: 'Eraaaaa of new',
    videoUrl: 'https://example.com/video2.mp4',
    thumbnail: 'https://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/_02e324a6-5593-4d5d-b8be-4bca5db079a5.jpg',
    category: 'Action',
    type: 'movie',
    language: 'English',
    duration: 120,
    climaxTimestamp: 45,
    premiumPrice: 99,
    genre: ['Action'],
    rating: 4.0,
    isActive: true,
    createdAt: '2025-07-19T13:02:28.180Z'
  }
];

// Routes
app.get('/api/contents', (req, res) => {
  console.log('📝 GET /api/contents - Fetching all content');
  res.json(contents);
});

app.get('/api/contents/:id', (req, res) => {
  console.log('📝 GET /api/contents/:id - Fetching content:', req.params.id);
  const content = contents.find(c => c._id === req.params.id);
  if (!content) {
    return res.status(404).json({ message: 'Content not found' });
  }
  res.json(content);
});

app.put('/api/contents/:id', (req, res) => {
  console.log('📝 PUT /api/contents/:id - Updating content:', req.params.id);
  console.log('📝 Payload received:', req.body);
  
  const contentIndex = contents.findIndex(c => c._id === req.params.id);
  if (contentIndex === -1) {
    return res.status(404).json({ message: 'Content not found' });
  }
  
  // Update the content
  contents[contentIndex] = { 
    ...contents[contentIndex], 
    ...req.body,
    _id: req.params.id // Ensure ID doesn't change
  };
  
  console.log('✅ Content updated successfully:', contents[contentIndex]);
  res.json(contents[contentIndex]);
});

app.post('/api/contents', (req, res) => {
  console.log('📝 POST /api/contents - Creating content');
  console.log('📝 Payload received:', req.body);
  
  const newContent = {
    _id: Date.now().toString(), // Simple ID generation
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  contents.unshift(newContent);
  console.log('✅ Content created successfully:', newContent);
  res.json(newContent);
});

app.delete('/api/contents/:id', (req, res) => {
  console.log('📝 DELETE /api/contents/:id - Deleting content:', req.params.id);
  
  const contentIndex = contents.findIndex(c => c._id === req.params.id);
  if (contentIndex === -1) {
    return res.status(404).json({ message: 'Content not found' });
  }
  
  contents.splice(contentIndex, 1);
  console.log('✅ Content deleted successfully');
  res.status(204).end();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Test Backend Server running on port', PORT);
  console.log('📋 Mock content database initialized with', contents.length, 'items');
});