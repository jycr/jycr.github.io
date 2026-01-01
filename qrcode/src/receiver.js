import "./app.css";
import { mount } from "svelte";
import Receiver from "./lib/Receiver.svelte";

const app = mount(Receiver, {
  target: document.body,
});

export default app;
