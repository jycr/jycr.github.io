<script>
</script>

<main>
  <h1>📱 QR Code File Transfer</h1>

  <div class="intro">
    <p>
      This application allows you to transfer files between two devices using QR codes.
    </p>
  </div>

  <div class="cards">
    <div class="card">
      <h2>📤 Sender</h2>
      <p>Send a file by generating a series of QR codes</p>
      <a href="/sender.html" class="button primary">Open Sender</a>
    </div>

    <div class="card">
      <h2>📥 Receiver</h2>
      <p>Receive a file by scanning QR codes</p>
      <a href="/receiver.html" class="button secondary">Open Receiver</a>
    </div>
  </div>

  <div style="text-align: center; margin: 2rem 0;">
    <a href="/guide.html" class="button" style="background: #764ba2; color: white; text-decoration: none; padding: 0.75rem 2rem; border-radius: 6px; display: inline-block;">
      📖 Complete Usage Guide
    </a>
  </div>

  <div class="info">
    <h3>How does it work?</h3>
    <ol>
      <li>On the sender device, open the <strong>Sender</strong> page and select a file</li>
      <li>On the receiver device, open the <strong>Receiver</strong> page and start scanning</li>
      <li>Place the receiver's camera facing the QR codes displayed by the sender</li>
      <li>Chunks will be progressively received and the file will be reconstructed</li>
      <li>If chunks are missing, generate a recovery QR from the receiver</li>
      <li>Scan this QR on the sender to retransmit only the missing chunks</li>
    </ol>
  </div>
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2.5rem;
  }

  .intro {
    text-align: center;
    margin-bottom: 3rem;
    font-size: 1.1rem;
    color: #666;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .card {
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0,0,0,0.15);
  }

  .card h2 {
    color: #333;
    margin-bottom: 1rem;
    font-size: 1.8rem;
  }

  .card p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .button {
    display: inline-block;
    padding: 0.75rem 2rem;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    transition: background-color 0.2s;
    color: white;
  }

  .button.primary {
    background-color: #4CAF50;
  }

  .button.primary:hover {
    background-color: #45a049;
  }

  .button.secondary {
    background-color: #2196F3;
  }

  .button.secondary:hover {
    background-color: #0b7dda;
  }

  .info {
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 2rem;
    margin-top: 2rem;
  }

  .info h3 {
    color: #333;
    margin-bottom: 1rem;
  }

  .info ol {
    line-height: 1.8;
    color: #555;
  }

  .info li {
    margin-bottom: 0.5rem;
  }
</style>
