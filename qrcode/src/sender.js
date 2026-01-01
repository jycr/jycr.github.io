import "./app.css";
import { mount } from "svelte";
import Sender from "./lib/Sender.svelte";

const app = mount(Sender, {
  target: document.body,
});

export default app;
