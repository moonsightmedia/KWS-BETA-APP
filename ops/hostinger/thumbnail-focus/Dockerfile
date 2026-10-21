# Build with a resolved official Python digest, not a floating tag:
# docker build --build-arg PYTHON_IMAGE=python@sha256:<verified digest> \
#   -f ops/hostinger/thumbnail-focus/Dockerfile services/thumbnail-focus
ARG PYTHON_IMAGE
FROM ${PYTHON_IMAGE}
ARG PYTHON_IMAGE
ARG SOURCE_REVISION
LABEL org.opencontainers.image.revision=${SOURCE_REVISION}
LABEL org.opencontainers.image.base.name=${PYTHON_IMAGE}
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --only-binary=:all: -r requirements.txt
COPY *.py ./
USER 10001:10001
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import json,os,urllib.request; d=json.load(urllib.request.urlopen('http://127.0.0.1:'+os.environ['THUMBNAIL_PORT']+'/api/health',timeout=3)); assert d['ok'] and not d['local_only'] and d['provider']=='CPUExecutionProvider'"
CMD ["python", "server.py"]
