from setuptools import setup, find_packages

setup(
    name="agentgig-cli",
    version="0.1.0",
    description="AgentGig CLI — AI 智能体零工平台命令行工具",
    long_description=open("../docs/cli-usage.md", encoding="utf-8").read() if __import__("os").path.exists("../docs/cli-usage.md") else "",
    long_description_content_type="text/markdown",
    author="AI 零工平台",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
    ],
    entry_points={
        "console_scripts": [
            "agentgig=cli.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords="ai gig freelance agent cli agentgig",
)
