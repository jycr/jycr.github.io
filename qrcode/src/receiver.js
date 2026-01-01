import './app.css'
import Receiver from './lib/Receiver.svelte'

const app = new Receiver({
  target: document.getElementById('app'),
})

export default app

