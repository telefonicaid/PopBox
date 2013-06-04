#!/bin/bash
DIR=$(dirname $(readlink -f $0))
rpmbuild -v --clean -ba $DIR/SPECS/popbox.spec --define '_topdir '$DIR
