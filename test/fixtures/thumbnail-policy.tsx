import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import SetterThumbnailReviewPage from '@/pages/setter/SetterThumbnailReviewPage';
import '@/index.css';
createRoot(document.getElementById('root')!).render(<MemoryRouter><SetterThumbnailReviewPage/></MemoryRouter>);
