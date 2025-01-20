import { config } from 'dotenv-pre';
import { main } from './main';

config({
  name: 'demo',
});

main().catch(console.error);
