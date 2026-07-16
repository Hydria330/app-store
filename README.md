#  App‑Store US Review‑Driven PRD Generator




> All data is fetched from Apple’s official public RSS Customer‑Reviews API.
> Every analysis conclusion can be traced back to genuine user reviews.
> This project is built exclusively for product‑research purposes only.

![Project Preview](./screenshot/preview.png)

## ✨ One‑Click Full Workflow
Execute the whole pipeline with just one click:
1. 📥 Fetch authentic customer reviews from the US App‑Store
2. 🧹 Perform automated data cleansing and validity verification
3. 📊 Organize review data and quantify user pain‑points through classification analysis
4. 🗓️ Generate multi‑version product iteration roadmaps
5. 📄 Auto‑generate standardized Product Requirement Documents (PRDs)
6. ✅ Output traceable test cases linked to original user comments


## 🚧 Important Deployment Notice
This web application has been deployed on Vercel.
Limited by the response‑length constraint of Vercel’s free‑tier plan, full‑length complete outputs are only available if you clone this repository and configure your local development environment.

### Two available usage modes
1. **Online Mode (Vercel Production)**
   Visitors input their own SiliconFlow API‑Key on the webpage. API calls consume their own quota, and your private key will not be used.
   You can keep your `SILICONFLOW_API_KEY` configured in Vercel environment variables as a fallback option for demonstration.

2. **Local Deployment Mode (Full‑Feature Version, Recommended)**
   - Option A: Enter your SiliconFlow API‑Key directly on the webpage.
   - Option B: Create a `.env.local` file under project root directory and fill in your key.

## 🛠️ Local Installation Guide
### Prerequisites
- Node.js >= 18
- pnpm package manager
- Valid SiliconFlow API‑Key

### Step‑by‑Step Setup
```bash
# Clone this repository
git clone https://github.com/Hydria330/app-store.git
cd app-store

# Install dependencies
pnpm install

# Start local development server
pnpm run dev
```

## 💡 Project‑Reflection & Future Optimization Direction
<details>
<summary>View project limitations and subsequent improvement ideas (Click to expand)</summary>

### Current Limitations
This workflow only relies on publicly available US App‑Store review data from Apple RSS API.
It cannot obtain core information including the existing product status, internal operation metrics, product development goals and quarterly OKRs.

As a result, the generated PRD and version‑iteration plans are generalized rather than highly‑targeted.
The analysis outcomes are derived purely from user complaints, which means the output cannot match the actual product situation automatically.
Manual screening and adjustments from product‑team members are mandatory to align conclusions with the real‑world product roadmap.

### Follow‑up Optimization Plans for production‑level usage
1. Supplement Product Baseline Information
Add an input area for product managers to fill in the present‑product features, known existing problems and long‑term product positioning. The LLM will combine these contents when generating subsequent iteration plans.
2. Integrate Official Back‑end Data
Access App Store Connect analytics data, including download volume, crash rate, version distribution and paying‑user data, to quantify the priority of user‑side pain‑points instead of only depending on comment frequency.
3. Introduce human‑in‑the‑loop confirmation mechanism
Set intermediate reviewing steps: after the initial PRD draft is generated, product members mark high‑priority requirements, then the model optimizes details based on manual feedback.
4. Build historical‑version data repository
Store past iteration records, so the model can avoid repeatedly proposing features that the team has already rejected in previous versions.
</details>


## 📄 License
<details>
<summary>📄 License (Click to expand)</summary>

This project is licensed under the MIT License.

Copyright © 2026 Hydria330

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</details>
