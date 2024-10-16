from flask import Flask, jsonify, request, render_template, redirect, url_for, session
import os
from openai import OpenAI
import logging
import fitz  # PyMuPDF library for handling PDFs

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Set a secret key for session management
logging.basicConfig(level=logging.DEBUG)

# Set up OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Simple password (in a real application, use a more secure method)
SECRET_PASSWORD = os.environ.get("SECRET_PASSWORD")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if request.form['password'] == SECRET_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid password')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/')
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/api/upload_pdf', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and file.filename.endswith('.pdf'):
        try:
            pdf_document = fitz.open(stream=file.read(), filetype="pdf")
            pages = []
            for page in pdf_document:
                text = page.get_text()
                pages.append(text)
            return jsonify({"pages": pages})
        except Exception as e:
            app.logger.error(f"An error occurred while processing the PDF: {str(e)}")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a PDF."}), 400

@app.route('/api/summarize', methods=['POST'])
def summarize():
    text = request.json['text']
    app.logger.info(f"Received text to summarize: {text}")

    system_prompt = 'you are an ai assistant that takes text and returns a bit more context based on the text. be brief, but helpful.'

    try:
        # Call GPT-4 API to generate summary
        app.logger.info("Calling OpenAI API")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the highlighted text:\n\n{text}"}
            ]
        )
        
        summary = response.choices[0].message.content
        app.logger.info(f"Generated summary: {summary}")
        return jsonify({"summary": summary})
    except Exception as e:
        app.logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/test_summary')
def test_summary():
    test_text = "This is a test sentence. It should be summarized."
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                {"role": "user", "content": f"Please summarize the following text:\n\n{test_text}"}
            ]
        )
        summary = response.choices[0].message.content
        return f"Original: {test_text}<br>Summary: {summary}"
    except Exception as e:
        return f"An error occurred: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
