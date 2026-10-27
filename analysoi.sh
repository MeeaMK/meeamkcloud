echo "Programming languages detected:" > analysis_report.txt

if find . -type f -name "*.py" -not -path "./.git/*" | grep -q .; then
  echo "- Python" | tee -a analysis_report.txt
fi

if find . -type f -name "*.java" -not -path "./.git/*" | grep -q .; then
  echo "- Java" | tee -a analysis_report.txt
fi

if find . -type f -name "*.js" -not -path "./.git/*" | grep -q .; then
  echo "- JavaScript" | tee -a analysis_report.txt
fi

if find . -type f -name "*.ts" -not -path "./.git/*" | grep -q .; then
  echo "- TypeScript" | tee -a analysis_report.txt
fi

echo "" | tee -a analysis_report.txt
echo "Design patterns detected:" | tee -a analysis_report.txt

if grep -R -n --exclude-dir=.git "getInstance" .; then
  echo "- Singleton" | tee -a analysis_report.txt
fi

if grep -R -n --exclude-dir=.git "create[A-Z]" .; then
  echo "- Factory Method" | tee -a analysis_report.txt
fi

if grep -R -n --exclude-dir=.git "notify" .; then
  echo "- Observer" | tee -a analysis_report.txt
fi

if grep -R -n --exclude-dir=.git "Strategy" .; then
  echo "- Strategy" | tee -a analysis_report.txt
fi

if grep -R -n --exclude-dir=.git "Decorator" .; then
  echo "- Decorator" | tee -a analysis_report.txt
fi
