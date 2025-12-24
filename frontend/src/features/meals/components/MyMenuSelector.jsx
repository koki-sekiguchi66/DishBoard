// src/features/meals/components/MyMenusSelector.jsx

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { customMenuApi } from '@/features/customMenus/api/customMenuApi';
import { toast } from 'react-hot-toast';

/**
 * Myメニューセレクター
 * 
 * 役割:
 * - 保存済みカスタムメニューの一覧を表示
 * - メニュー選択で全アイテムを読み込み
 * 
 * 設計原則:
 * - ローディング状態の管理
 * - エラーハンドリング
 */
const MyMenusSelector = ({ menuBuilder }) => {
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // カスタムメニュー一覧取得
  useEffect(() => {
    const fetchMenus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await customMenuApi.getMenus();
        setMenus(data);
      } catch (err) {
        console.error('メニュー取得エラー:', err);
        setError('メニューの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMenus();
  }, []);
  
  // メニューを読み込む
  const handleSelectMenu = async (menuId) => {
    try {
      const menuDetail = await customMenuApi.getMenuDetail(menuId);
      menuBuilder.loadFromCustomMenu(menuDetail);
    } catch (err) {
      console.error('メニュー読み込みエラー:', err);
      toast.error('メニューの読み込みに失敗しました');
    }
  };
  
  // ローディング中
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </Spinner>
        <p className="text-muted mt-2">メニューを読み込み中...</p>
      </div>
    );
  }
  
  // エラー時
  if (error) {
    return (
      <Alert variant="danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </Alert>
    );
  }
  
  // メニューが0件
  if (menus.length === 0) {
    return (
      <Alert variant="info">
        <i className="bi bi-info-circle me-2"></i>
        保存されたメニューがありません。メニューを作成して保存してください。
      </Alert>
    );
  }
  
  // メニュー一覧表示
  return (
    <div>
      <h6 className="mb-3">
        <i className="bi bi-bookmark-star me-2"></i>
        保存済みメニュー ({menus.length}件)
      </h6>
      
      <ListGroup>
        {menus.map((menu) => (
          <ListGroup.Item
            key={menu.id}
            className="d-flex justify-content-between align-items-start"
          >
            <div className="flex-grow-1">
              <div className="fw-bold mb-1">{menu.name}</div>
              
              {menu.description && (
                <p className="text-muted small mb-2">{menu.description}</p>
              )}
              
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Badge bg="info">
                  {menu.total_calories.toFixed(0)} kcal
                </Badge>
                <Badge bg="secondary">
                  P: {menu.total_protein.toFixed(1)}g
                </Badge>
                <Badge bg="secondary">
                  F: {menu.total_fat.toFixed(1)}g
                </Badge>
                <Badge bg="secondary">
                  C: {menu.total_carbohydrates.toFixed(1)}g
                </Badge>
              </div>
              
              <small className="text-muted">
                <i className="bi bi-list-ul me-1"></i>
                {menu.items_count}個のアイテム
              </small>
            </div>
            
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSelectMenu(menu.id)}
              className="ms-2"
            >
              <i className="bi bi-plus-circle me-1"></i>
              読み込む
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
};

export default MyMenusSelector;