import os
import json
import urllib.request
import urllib.error

backend_dir = r"C:\Users\Dina\.gemini\antigravity\scratch\gios-backend"
output_file = r"C:\Users\Dina\GIOS\frontend_generation_result.md"

def get_all_python_files(directory):
    files_content = []
    for root, _, files in os.walk(directory):
        if "__pycache__" in root or ".cache" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    rel_path = os.path.relpath(filepath, directory)
                    files_content.append(f"--- File: {rel_path} ---\n{content}\n")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    return "\n".join(files_content)

def main():
    print("Collecting backend files...")
    backend_code = get_all_python_files(backend_dir)
    print(f"Collected {len(backend_code)} characters of code.")
    
    prompt = f"""
You are an expert frontend developer. I have written a complete FastAPI backend for an environmental monitoring platform called GIOS. 
Your task is to generate the complete frontend code for this platform based on the backend API files provided below.
Please create a visually stunning, modern, and dynamic Single Page Application using HTML, CSS (no external CSS frameworks like Tailwind unless via CDN if absolutely necessary, but preferably vanilla CSS with modern design), and Vanilla JavaScript.
The frontend should allow users to interact with the backend APIs (e.g., search scenes, compute indices, view time-series, etc.).
Please provide the complete code for `index.html` (including embedded CSS and JS or explain how to separate them).

Here is the backend code:
{backend_code}
"""
    
    data = {
        "model": "qwen2.5-coder:1.5b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": 32000
        }
    }
    
    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    print("Sending request to Ollama (qwen2.5-coder:1.5b)...")
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            generated_text = result.get("response", "")
            
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(generated_text)
            print(f"Successfully generated frontend code and saved to {output_file}")
            
    except urllib.error.URLError as e:
        print(f"Failed to connect to Ollama: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
