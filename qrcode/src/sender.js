import './app.css'
import Sender from './lib/Sender.svelte'

const app = new Sender({
  target: document.getElementById('app'),
})

export default app
