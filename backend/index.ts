import 'dotenv/config';
import app from './src/app';

const PORT = process.env['PORT'] ?? '3000';

app.listen(Number(PORT), () => {
  console.log(`Server running on port ${PORT}`);
});
